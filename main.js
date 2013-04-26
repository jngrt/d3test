jQuery(function($){


    /*
    * App logic 
    */

    var App = {
        fitbit_id:327992,
        zeo_id:325683,
        init:function(){
            var self = this;
            if( CS.hasSession() ) this.loadData();

            /* attach a submit handler to the form */
            $("#login").submit(function(event) {
                event.preventDefault();
                CS.login( $("#username").val(), $("#password").val(), $.proxy(self.loadData,self)); 
            });

            D3Test.init();
        },
        loadData:function(){
            //CS.getSensorData(this.sensor_id,$.proxy(App.parseData,App));
            CS.getSensorDataRange( this.fitbit_id, new Date(2013,3,1),new Date(2013,3,2), 
                $.proxy(function(data){ D3Test.addGraph("fitbit",data,"#f00");},this));

            CS.getSensorDataRange( this.zeo_id,new Date(2013,3,1),new Date(2013,3,2), 
                $.proxy(function(data){ D3Test.addGraph("zeo",data,"#0f0");},this));
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
            
            this.getSensorData( id, {start_date:(+start)/1000,end_date:(+end)/1000,per_page:1000},$.proxy(function(data){
                console.log("got data");
                callback(data);
            },this));


        }
    };



    /*
    * D3 test
    */
    D3Test = {
        graphCount:0, 
        init:function(data){
            self = this;
            this.margin = {top: 20, right: 20, bottom: 30, left: 50};
            this.width = 960 - this.margin.left - this.margin.right,
            this.height = 200 - this.margin.top - this.margin.bottom;

            this.x = d3.time.scale()
            .range([0, this.width-30]);

            this.y1 = d3.scale.linear()
            .range([this.height, 0]);

            this.y2 = d3.scale.linear()
            .range([this.height, 0]);

            this.xAxis = d3.svg.axis()
            .scale(this.x)
            .orient("bottom");

            this.yAxis1 = d3.svg.axis()
            .scale(this.y1)
            .orient("left");

            this.yAxis2 = d3.svg.axis()
            .scale(this.y2)
            .orient("right");


            this.line1 = d3.svg.line()
            .x(function(d) { return self.x(d.date); })
            .y(function(d) { return self.y1(d.value); });

            this.line2 =  d3.svg.line()
            .x(function(d) { return self.x(d.date); })
            .y(function(d) { return self.y2(d.value); });


            this.svg = d3.select("body").append("svg")
            .attr("width", this.width + this.margin.left + this.margin.right)
            .attr("height", this.height + this.margin.top + this.margin.bottom)
            .append("g")
            .attr("transform", "translate(" + this.margin.left + "," + this.margin.top + ")");

        },
        addGraph:function(title,data,scolor){
            
            data.forEach(function(d) {
                d.date = new Date(d.date*1000);
                d.value = +d.value;
            });

            //x axis is same for multiple graphs
            if(!this.graphCount){
                this.x.domain(d3.extent(data, function(d) { return d.date; }));
            
                this.svg.append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + this.height + ")")
                .call(this.xAxis);
            }
            
            this.y1.domain([
                d3.min(data,function(d){return d.value;})-1
                , d3.max(data,function(d){return d.value;})+1]);
            
            this.y2.domain([ 
                d3.min(data,function(d){return d.value;})-1
                , d3.max(data,function(d){return d.value;})+1]);
           
            this.svg.append("path")
            .datum(data)
            .attr("class", "line")
            .attr("d", !!this.graphCount?this.line2:this.line1)
            .style("stroke", scolor);

            this.svg.append("g")
            //.attr("transform", "translate("+(this.graphCount*-50)+",0)")
            .attr("class", "y axis")
            .style("fill", scolor)
            .attr("transform","translate("+(!!this.graphCount?this.width-30:0)+",0)")
            .call(!!this.graphCount?this.yAxis2:this.yAxis1)
            .append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 6)
            .attr("dy", !!this.graphCount?"-1.0em":"0.71em")
            .style("text-anchor", "end")
            .text(title);

        
            this.graphCount++;

        }
    };


    App.init();
});

