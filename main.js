jQuery(function($){


    /*
    * App logic 
    */

    var App = {
        fitbit_id:327992,
        zeo_id:325683,
        graphs:[],
        init:function(){
            var self = this;
            if( CS.hasSession() ) this.loadData();

            /* attach a submit handler to the form */
            $("#login").submit(function(event) {
                event.preventDefault();
                CS.login( $("#username").val(), $("#password").val(), $.proxy(self.loadData,self)); 
            });

            // D3Test.init();
        },
        loadData:function(){
            var self = this;
            //CS.getSensorData(this.sensor_id,$.proxy(App.parseData,App));
            CS.getSensorDataRange( this.fitbit_id, new Date(2013,3,1),new Date(2013,3,2), 
                $.proxy(function(data){ 
                    self.graphs.push( new D3TestGraph("fitbit",data,"#f00"));
                },this));

            CS.getSensorDataRange( this.zeo_id,new Date(2013,3,1),new Date(2013,3,2), 
                $.proxy(function(data){ 
                    self.graphs.push( new D3TestGraph("zeo",data,"#0f0"));
                },this));
        }
    };


    /*
    * CS helper
    */
    var CS = {
        session_id:null,
        url:'https://api.sense-os.nl/',
        hasSession:function(){
            this.session_id = $(document).sessionStorage("session_id");
            return !!this.session_id;
        },
        login:function(name,pass,callback){
            $.ajax({
                url:this.url+'login.json',
                type:"POST",
                data: JSON.stringify({
                    username:name,
                    password:$.md5(pass)
                }),
                contentType:"application/json; charset=utf-8",
                dataType:"json",
                success: function(response){
                    $(document).sessionStorage("session_id", response.session_id);
                    callback();
                }
            })
        },
        getSensorData:function( id, params, callback ){

            $.ajax({
                url:this.url+'sensors/'+id+'/data'+this.paramString(params),
                dataType:"json",
                beforeSend: function (request)
                {
                    request.setRequestHeader("X-SESSION_ID",CS.session_id );
                    request.setRequestHeader("Accept","*");
                },
                type:"GET",
                success: function(r){
                    console.log("ajax result:");
                    console.log(r);
                    callback(r.data); 
                }
            })
        },
        paramString:function(a){
            var str = [];
            for(var p in a) {
                str.push(encodeURIComponent(p) + "=" + encodeURIComponent(a[p]));
            }
            str = "?"+str.join("&");
            console.log(str);
            return str;
        },
        getSensorDataRange:function( id, start, end, callback ){
            // var data = [];
            
            this.getSensorData( id, {
                    start_date:(+start)/1000,
                    end_date:(+end)/1000,per_page:1000},
                $.proxy(function(data){
                    console.log("got data");
                    callback(data);
                },this));

        }
    };



    /*
    * D3 test
    */
    function D3TestGraph (title, data, scolor){
        self = this;
        this.margin = {top: 10, right: 10, bottom: 70, left: 40};
        this.margin2 = {top: 160, right: 10, bottom: 20, left: 40};
        this.width = 960 - this.margin.left - this.margin.right,
        this.height = 200 - this.margin.top - this.margin.bottom;
        this.height2 = 200 - this.margin2.top - this.margin2.bottom;

        this.x = d3.time.scale().range([0, this.width]);
        this.x2 = d3.time.scale().range([0, this.width]);
        this.y = d3.scale.linear().range([this.height, 0]);
        this.y2 = d3.scale.linear().range([this.height2, 0]);


        this.xAxis = d3.svg.axis().scale(this.x).orient("bottom");
        this.xAxis2 = d3.svg.axis().scale(this.x2).orient("bottom");
        this.yAxis = d3.svg.axis().scale(this.y).orient("left"); 

        this.brush = d3.svg.brush()
        .x(this.x2)
        .on("brush", $.proxy(this.brushed,this));

        this.line = d3.svg.line()
        .x(function(d) { return self.x(d.date); })
        .y(function(d) { return self.y(d.value); });

        this.line2 = d3.svg.line()
        .x(function(d) { return self.x2(d.date); })
        .y(function(d) { return self.y2(d.value); });

        this.svg = d3.select("body").append("svg")
        .attr("width", this.width + this.margin.left + this.margin.right)
        .attr("height", this.height + this.margin.top + this.margin.bottom)
       
        this.svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", this.width)
        .attr("height", this.height);

        this.focus = this.svg.append("g")
        .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");
        this.context = this.svg.append("g")
        .attr("transform", "translate(" +this.margin2.left + "," +this.margin2.top +")");
      

        data.forEach(function(d) {
            d.date = new Date(d.date*1000);
            d.value = +d.value;
        });

        this.x.domain(d3.extent(data, function(d) { return d.date; }));
        this.x2.domain(this.x.domain());
        this.y.domain([
            d3.min(data,function(d){return d.value;})-1,
            d3.max(data,function(d){return d.value;})+1
        ]);
        this.y2.domain(this.y.domain());
        

        this.focus.append("path")
        .datum(data)
        .attr("class", "line")
        .attr("d", this.line)
        .attr("clip-path","url(#clip)")
        .style("stroke", scolor);

        this.focus.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + this.height + ")")
        .call(this.xAxis);

        this.focus.append("g")
        .attr("class", "y axis")
        .style("fill", scolor)
        .call(this.yAxis)
        .append("text")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", "0.71em")
        .style("text-anchor", "end")
        .text(title);

        this.context.append("path")
        .datum(data)
        .attr("d",this.line2)

        this.context.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0,"+this.height2+")")
        .call(this.xAxis2);

        this.context.append("g")
        .attr("class","x brush")
        .call(this.brush)
        .selectAll("rect")
        .attr("y",-6)
        .attr("height",this.height2+7);
        
        this.test = "haha";
    };
    D3TestGraph.prototype.brushed = function() {
        console.log("brushed");
        console.log(this.test);
        this.x.domain(this.brush.empty() ? this.x2.domain() : this.brush.extent());
        this.focus.select("path").attr("d", this.line);
        this.focus.select(".x.axis").call(this.xAxis);
    };


    App.init();
});

